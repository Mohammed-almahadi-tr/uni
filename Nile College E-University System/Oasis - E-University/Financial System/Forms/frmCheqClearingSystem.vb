Imports System.Data.SqlClient

Public Class frmCheqClearingSystem

    Sub FillCheqs()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim CheqStatusCond, Status As String

            If Me.RPending.Checked = True Then
                CheqStatusCond = "CheqClear=0 and "

            ElseIf Me.RCleared.Checked = True Then
                CheqStatusCond = "CheqClear=1 and "

            ElseIf Me.RAll.Checked = True Then
                CheqStatusCond = ""
            End If

            Dim cmd As New SqlCommand("Select * From Transactions Where " & CheqStatusCond & " CheqDate Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.GridVouchers.Rows.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                If CInt(Reader.Item("CheqClear")) = 0 Then
                    Status = "Rejected"

                ElseIf CInt(Reader.Item("CheqClear")) = 1 Then
                    Status = "Cleared"
                End If
                Me.GridVouchers.Rows.Add(New String() {Reader.Item("TransNo"), Reader.Item("Acc4"), Reader.Item("ChNo"), _
                                                       CDate(Reader.Item("CheqDate")).ToString("yyyy/MM/dd"), Reader.Item("Source"), _
                                                       Reader.Item("Descr"), CDbl(Reader.Item("TotalValueIn")).ToString("N2"), _
                                                       CDate(Reader.Item("TransDate")).ToString("yyyy/MM/dd"), Status, "Cleared", "Rejected"})
            End While
            cnn.Close()

            For Each row As DataGridViewRow In Me.GridVouchers.Rows
                If row.Cells(8).Value = "Rejected" Then
                    row.Cells(8).Style.BackColor = Color.Yellow

                ElseIf row.Cells(8).Value = "Cleared" Then
                    row.Cells(8).Style.BackColor = Color.LightGreen
                End If
            Next

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub frmCheqClearingSystem_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        FillCheqs()
    End Sub

    Private Sub RCleared_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RCleared.CheckedChanged
        FillCheqs()
    End Sub

    Private Sub RPending_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RPending.CheckedChanged
        FillCheqs()
    End Sub

    Private Sub GridVouchers_CellClick(sender As System.Object, e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridVouchers.CellClick
        If e.ColumnIndex = 9 Then 'Cleared
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand("Update Transactions Set CheqClear=1 Where TransNo=" & Me.GridVouchers.Rows(e.RowIndex).Cells(0).Value, cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                Me.GridVouchers.Rows(e.RowIndex).Cells(8).Value = "Cleared"
                Me.GridVouchers.Rows(e.RowIndex).Cells(8).Style.BackColor = Color.LightGreen

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        ElseIf e.ColumnIndex = 10 Then 'Not Cleared
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand("Update Transactions Set CheqClear=0 Where TransNo=" & Me.GridVouchers.Rows(e.RowIndex).Cells(0).Value, cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                Me.GridVouchers.Rows(e.RowIndex).Cells(8).Value = "Rejected"
                Me.GridVouchers.Rows(e.RowIndex).Cells(8).Style.BackColor = Color.Yellow

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

    Private Sub RAll_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles RAll.CheckedChanged
        FillCheqs()
    End Sub

    
End Class