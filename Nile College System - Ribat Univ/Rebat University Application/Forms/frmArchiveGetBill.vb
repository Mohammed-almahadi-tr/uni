Imports System.Data.SqlClient

Public Class frmArchiveGetBill

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.ListView1.Items.Clear()
            Dim cmd As New SqlCommand("Select SNo,Letter,StudName,TuitionFees+RegFees+Stam+MadicalInsh+Clus+HiEdu+Univar+MedExamFees,BillDate " & _
                                      "From Transactions Where TransType=N'سند قبض' and " & _
                                      "TransDate>N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' and " & _
                                      "TransDate<N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                    .SubItems.Add(Format(Reader.Item(3), "##,###.##"))
                    .SubItems.Add(Reader.Item(4))
                End With
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub ListView1_DoubleClick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ListView1.DoubleClick
        If Me.ListView1.SelectedItems.Count = 0 Then
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                PrintBill("سند قبض", Me.ListView1.SelectedItems(0).SubItems(1).Text, CInt(Me.ListView1.SelectedItems(0).Text))
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.Message)
            End Try
        End If
    End Sub
End Class