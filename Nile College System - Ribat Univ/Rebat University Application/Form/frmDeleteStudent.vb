Imports System.Data.SqlClient

Public Class frmDeleteStudent

    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StdName,College,Batch " & _
                                      "From StdFinancial Where StdID=" & CStr(Me.txtStudID.Text), cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStudName.Text = reader.Item("StdName")
                Me.txtCollege.Text = reader.Item("College")
                Me.txtBatch.Text = reader.Item("Batch")
            End While
            cnn.Close()

            If Me.txtStudName.Text.Trim.Length <> 0 Then
                FillBalance()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillBalance()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select Case When Sum(TotalValueOut)-Sum(TotalValueIn) Is Null Then 0 " & _
                                      "            Else Sum(TotalValueOut)-Sum(TotalValueIn) End From Transactions " & _
                                      "Where StudID=" & Me.txtStudID.Text.Trim, cnn)

            cnn.Open()
            Me.txtBalance.Text = cmd.ExecuteScalar
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtStudID_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStudID.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
        End If
    End Sub

    Private Sub txtStudID_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStudID.TextChanged
        Me.txtStudName.Clear()
        Me.txtCollege.Clear()
        Me.txtBatch.Clear()
        Me.txtBalance.Clear()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStudID.Text = SelStudID
        FillStudDetails()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.txtStudID.Clear()
        Me.txtStudID.Focus()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            If Me.txtBalance.Text <> "0" Then
                MsgBox("حساب الطالب به رصيد")
                Exit Sub
            End If

            If MsgBox("تأكيد الحذف؟", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Delete From StdFinancial Where StdID=" & Me.txtStudID.Text, cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                Me.txtStudID.Clear()
                Me.txtStudID.Focus()
                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class