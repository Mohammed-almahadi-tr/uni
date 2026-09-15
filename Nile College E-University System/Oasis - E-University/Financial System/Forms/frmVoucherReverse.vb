Imports System.Data.SqlClient

Public Class frmVoucherReverse

    Sub Fill()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Acc1,Acc2,Acc3,Acc4,IsNull(StudID,N'') StudID,IsNull(StudName,N'') StudName,Descr,TotalValueOut,TotalValueIn,TransDate,Reversed From Transactionees Where MoveNo=" & Me.txtMoveNo.Text.Trim & _
                                      " and Year(TransDate)=" & Me.CombTransYear.SelectedItem, cnn)
            Dim Reader As SqlDataReader
            Dim Status As Integer

            Me.GridVouchers.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridVouchers.Rows.Add(New String() {Reader.Item("Acc1"), Reader.Item("Acc2"), Reader.Item("Acc3"), Reader.Item("Acc4"), Reader.Item("StudID"), _
                                                       Reader.Item("StudName"), Reader.Item("Descr"), Reader.Item("TotalValueOut"), Reader.Item("TotalValueIn")})
                Me.DTPTrans.Value = CDate(Reader.Item("TransDate"))
                Status = CInt(Reader.Item("Reversed"))
            End While
            cnn.Close()

            GetStatus(Status)

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub GetStatus(ByVal Status As Integer)
        If Status = 0 Then
            Me.lblStatus.Text = ""
        ElseIf Status = 1 Then
            Me.lblStatus.Text = "Reversed"
        End If
    End Sub

    Private Sub txtMoveNo_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtMoveNo.KeyUp
        If e.KeyCode = Keys.Enter Then
            If Me.txtMoveNo.Text.Trim.Length > 0 Then
                Fill()
            End If
        End If
    End Sub

    Private Sub txtMoveNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtMoveNo.TextChanged
        Me.GridVouchers.Rows.Clear()
        Me.lblStatus.Text = ""
    End Sub

    Private Sub frmVoucherEdit_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.lblStatus.Text = ""
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct Year(TransDate) From Transactionees", cnn)
            Dim SqlReader As SqlDataReader

            Me.CombTransYear.Items.Clear()

            cnn.Open()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.CombTransYear.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

            If Me.CombTransYear.Items.Count > 0 Then
                Me.CombTransYear.SelectedIndex = 0
            End If

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub

    Private Sub CombTransYear_SelectedIndexChanged(sender As System.Object, e As System.EventArgs) Handles CombTransYear.SelectedIndexChanged
        Me.GridVouchers.Rows.Clear()
    End Sub

    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles Button1.Click
        If Me.GridVouchers.Rows.Count = 0 Then
            Exit Sub
        ElseIf MsgBox("Confirm reversing voucher?", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer
                Dim i As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim Time As String

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans

                cmd.CommandText = "Select IsNull(Max(MoveNo),0) From Transactionees Where Year(TransDate)=" & Me.DTPTrans.Value.Year
                MoveNo = CInt(cmd.ExecuteScalar) + 1

                cmd.CommandText = "Select GetDate()"
                Time = CDate(cmd.ExecuteScalar).ToString("HH:mm:ss")

                For i = 0 To Me.GridVouchers.Rows.Count - 1
                    cmd.CommandText = "Insert into Transactionees (TransType,MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueIn,TotalValueOut,UserName,TransDate) " & _
                             "Values (@TransType,@MoveNo,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@StudID,@StudName,@TotalValueIn,@TotalValueOut,@UserName,@TransDate)"

                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@TransType", "Journal Voucher")
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Descr", "Reversing voucher # " & Me.txtMoveNo.Text.Trim)
                    cmd.Parameters.AddWithValue("@Acc1", Me.GridVouchers.Rows(i).Cells(0).Value)
                    cmd.Parameters.AddWithValue("@Acc2", Me.GridVouchers.Rows(i).Cells(1).Value)
                    cmd.Parameters.AddWithValue("@Acc3", Me.GridVouchers.Rows(i).Cells(2).Value)
                    cmd.Parameters.AddWithValue("@Acc4", Me.GridVouchers.Rows(i).Cells(3).Value)
                    'cmd.Parameters.AddWithValue("@Acc5", Me.GridVouchers.Rows(i).Cells(4).Value)
                    cmd.Parameters.AddWithValue("@StudID", Me.GridVouchers.Rows(i).Cells(5).Value)
                    cmd.Parameters.AddWithValue("@StudName", Me.GridVouchers.Rows(i).Cells(6).Value)
                    cmd.Parameters.AddWithValue("@TotalValueOut", CDbl(Me.GridVouchers.Rows(i).Cells(9).Value))
                    cmd.Parameters.AddWithValue("@TotalValueIn", CDbl(Me.GridVouchers.Rows(i).Cells(8).Value))
                    cmd.Parameters.AddWithValue("@TransDate", Me.DTPTrans.Value.ToString("MM/dd/yyyy") & " " & Time)
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)

                    cmd.ExecuteNonQuery()
                Next

                cmd.Parameters.Clear()
                cmd.CommandText = "Update Transactionees Set Reversed=1 Where MoveNo=" & Me.txtMoveNo.Text.Trim
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                PrintVoucher(MoveNo, Me.DTPTrans.Value.Year)

                'Reset controls
                Me.txtMoveNo.Clear()
                Me.txtMoveNo.Focus()
                Me.GridVouchers.Rows.Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button4_Click(sender As System.Object, e As System.EventArgs) Handles Button4.Click
        If Me.txtMoveNo.Text.Trim.Length > 0 Then
            Fill()
        End If
    End Sub
End Class