
Imports System.Data.SqlClient
Public Class frmdelet


    Private Sub Button2_Click_1(sender As System.Object, e As System.EventArgs) Handles Button2.Click
        Me.ErrorProvider1.Clear()
        If Me.txtstuno.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.txtstuno, "الرجاء ادخال الرقم الجامعي ")
            Exit Sub
        End If
        Try
            Dim cmd As New SqlCommand
            Dim Trans As SqlTransaction
            cnn.Open()
            Trans = cnn.BeginTransaction
            cmd.Connection = cnn
            cmd.Transaction = Trans




            'Delete the record for old program

            cmd.CommandText = "Delete from StdForm where UnivID=N'" & Me.txtstuno.Text & "' "
            cmd.ExecuteNonQuery()
            Trans.Commit()
            cnn.Close()
            MsgBox("تم الحذف بنجاح")
            Me.txtstuno.Clear()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try

    End Sub
End Class
