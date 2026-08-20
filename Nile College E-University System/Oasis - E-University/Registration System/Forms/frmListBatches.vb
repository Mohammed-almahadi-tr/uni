Imports System.Data.SqlClient

Public Class frmListBatches

    Sub FillList()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct Batch From AcademicYear where Batch Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.ListAppointDescr.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListAppointDescr.Items.Add(Reader.Item(0))
                End With
            End While
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

    Private Sub frmIncurClassesList_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillList()
    End Sub

    Private Sub Button3_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

    Private Sub btnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSave.Click
        Try
            If Me.txtCategory.Text.Trim.Length = 0 Then
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Insert Into AcademicYear (Batch) Values(N'" & Me.txtCategory.Text.Trim & "')", cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()

            FillList()

            Me.txtCategory.Clear()
            Me.txtCategory.Focus()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub btnRemove_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnRemove.Click
        If Me.ListAppointDescr.SelectedItems.Count > 0 Then
            If MsgBox("Confirm delete?", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
                Try
                    Me.Cursor = Cursors.WaitCursor
                    Dim cmd As New SqlCommand("Delete From AcademicYear Where Batch=N'" & Me.ListAppointDescr.SelectedItems(0).Text & "'", cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    FillList()

                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn.State = ConnectionState.Open Then
                        cnn.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            End If
        End If
    End Sub

End Class